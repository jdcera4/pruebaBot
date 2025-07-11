import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WhatsappService, Message } from '../../core/services/whatsapp.service';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss']
})
export class MessagesComponent implements OnInit {
  getInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  messages: Message[] = [];
  filteredMessages: Message[] = [];
  isLoading = true;
  errorMsg = '';
  page = 1;
  limit = 10;
  totalPages = 1;
  search = '';
  
  // Interface for the message display in the template
  displayMessage = {
    id: '',
    from: '',
    to: '',
    message: '',
    status: '',
    sentAt: new Date(),
    mediaUrl: ''
  };

  constructor(private whatsappService: WhatsappService) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.loadMessages();
  }

  loadMessages(): void {
    this.whatsappService.getMessages().subscribe({
      next: (messages) => {
        this.messages = messages || [];
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.warn('Messages endpoint not available, using empty messages list');
        this.messages = [];
        this.errorMsg = 'La funcionalidad de mensajes no está disponible actualmente. Por favor, intente más tarde.';
        this.isLoading = false;
        this.applyFilters();
      }
    });
  }

  onSearch(term: string): void {
    this.search = term.trim();
    this.page = 1;
    this.applyFilters();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.page = page;
    this.applyFilters();
  }

  applyFilters(): void {
    if (!this.messages || this.messages.length === 0) {
      this.filteredMessages = [];
      this.totalPages = 1;
      this.page = 1;
      return;
    }

    let msgs = [...this.messages];
    
    // Apply search filter if there's a search term
    if (this.search) {
      const searchTerm = this.search.toLowerCase().trim();
      msgs = msgs.filter(m => 
        (m.to && m.to.toLowerCase().includes(searchTerm)) ||
        (m.message && m.message.toLowerCase().includes(searchTerm)) ||
        (m.from && m.from.toLowerCase().includes(searchTerm))
      );
    }

    // Update filtered messages and pagination
    this.filteredMessages = msgs;
    this.totalPages = Math.max(1, Math.ceil(msgs.length / this.limit));
    
    // Ensure current page is within valid range
    if (this.page > this.totalPages) {
      this.page = this.totalPages;
    } else if (this.page < 1) {
      this.page = 1;
    }
  }
}
