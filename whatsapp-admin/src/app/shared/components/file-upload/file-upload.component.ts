import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

export interface FilePreview {
  file: File;
  dataUrl: string;
  type: 'image' | 'video' | 'document';
  name: string;
  size: string;
}

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule
  ]
})
export class FileUploadComponent implements OnInit {
  _uid = Math.random().toString(36).substring(2, 11);
  
  @Input() accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx';
  @Input() maxSizeMB = 10;
  @Input() multiple = false;
  @Input() label = 'Seleccionar archivo';
  @Input() preview = true;

  @Output() filesSelected = new EventEmitter<File[]>();
  @Output() fileRemoved = new EventEmitter<File>();

  previews: FilePreview[] = [];
  isDragging = false;
  error: string | null = null;
  
  ngOnInit(): void {
    // Component initialization
  }

  // Supported file types for preview
  private readonly imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private readonly videoTypes = ['video/mp4', 'video/webm', 'video/ogg'];

  /**
   * Handle file selection from input
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFiles(Array.from(input.files));
      input.value = ''; // Reset input to allow selecting the same file again
    }
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  /**
   * Handle drag leave event
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  /**
   * Handle drop event
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.processFiles(Array.from(event.dataTransfer.files));
    }
  }

  /**
   * Process selected files and create previews
   */
  private async processFiles(files: File[]): Promise<void> {
    this.error = null;

    // Check if multiple files are allowed
    if (!this.multiple) {
      files = [files[0]]; // Only take the first file if multiple is false
      this.previews = []; // Clear previous previews
    }

    // Check total size
    const totalSize = files.reduce((acc, file) => acc + file.size, 0);
    if (totalSize > this.maxSizeMB * 1024 * 1024) {
      this.error = `El tamaño total de los archivos no debe exceder ${this.maxSizeMB}MB`;
      return;
    }

    // Process each file
    for (const file of files) {
      // Check file type
      if (!this.isFileTypeAllowed(file)) {
        this.error = `Tipo de archivo no permitido: ${file.name}`;
        continue;
      }

      // Check individual file size
      if (file.size > this.maxSizeMB * 1024 * 1024) {
        this.error = `El archivo ${file.name} excede el tamaño máximo de ${this.maxSizeMB}MB`;
        continue;
      }

      // Create preview
      try {
        const preview = await this.createFilePreview(file);
        this.previews.push(preview);
      } catch (error) {
        console.error('Error creating preview:', error);
        this.error = `No se pudo cargar el archivo: ${file.name}`;
      }
    }

    // Emit selected files
    if (this.previews.length > 0) {
      this.filesSelected.emit(this.previews.map(p => p.file));
    }
  }

  /**
   * Check if file type is allowed
   */
  private isFileTypeAllowed(file: File): boolean {
    if (!this.accept) return true;

    const acceptedTypes = this.accept
      .split(',')
      .map(type => type.trim())
      .filter(type => type !== '*/*');

    if (acceptedTypes.length === 0) return true;

    return acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        // File extension check
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      } else if (type.endsWith('/*')) {
        // MIME type wildcard check (e.g., 'image/*')
        const mimeType = type.split('/')[0];
        return file.type.startsWith(mimeType);
      } else {
        // Exact MIME type check
        return file.type === type;
      }
    });
  }

  /**
   * Create a preview object for a file
   */
  private createFilePreview(file: File): Promise<FilePreview> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      // Determine file type
      let fileType: 'image' | 'video' | 'document' = 'document';
      if (this.imageTypes.includes(file.type)) {
        fileType = 'image';
      } else if (this.videoTypes.includes(file.type)) {
        fileType = 'video';
      }

      // Set up file reader
      reader.onload = (e: any) => {
        resolve({
          file,
          dataUrl: e.target.result,
          type: fileType,
          name: file.name,
          size: this.formatFileSize(file.size)
        });
      };

      reader.onerror = (error) => {
        reject(error);
      };

      // Read file as data URL for preview
      if (fileType === 'image') {
        reader.readAsDataURL(file);
      } else {
        // For non-image files, we don't need to read the content
        resolve({
          file,
          dataUrl: this.getFileIcon(file.type),
          type: fileType,
          name: file.name,
          size: this.formatFileSize(file.size)
        });
      }
    });
  }

  /**
   * Format file size in a human-readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get icon for file type
   */
  private getFileIcon(mimeType: string): string {
    // Return appropriate icon based on MIME type
    if (mimeType.includes('pdf')) return 'assets/icons/pdf-icon.svg';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'assets/icons/word-icon.svg';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'assets/icons/excel-icon.svg';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'assets/icons/ppt-icon.svg';
    if (mimeType.includes('video')) return 'assets/icons/video-icon.svg';
    return 'assets/icons/file-icon.svg';
  }

  /**
   * Remove a file from the preview
   */
  removeFile(index: number): void {
    const removedFile = this.previews[index].file;
    this.previews.splice(index, 1);
    this.fileRemoved.emit(removedFile);
  }

  /**
   * Clear all files
   */
  clearFiles(): void {
    this.previews.forEach(preview => this.fileRemoved.emit(preview.file));
    this.previews = [];
  }

  /**
   * Get all selected files
   */
  getFiles(): File[] {
    return this.previews.map(p => p.file);
  }

  /**
   * Check if there are any files selected
   */
  hasFiles(): boolean {
    return this.previews.length > 0;
  }
}
