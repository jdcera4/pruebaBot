import { Component } from '@angular/core';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-excel-upload',
  templateUrl: './excel-upload.component.html',
  styleUrls: ['./excel-upload.component.css']
})
export class ExcelUploadComponent {
  origenesUnicos: string[] = [];
  contactosPorOrigen: { [origen: string]: Array<{ nombre: string, celular: string }> } = {};
  mensajesPorOrigen: { [origen: string]: string } = {};

  onFileChange(evt: any) {
    const target: DataTransfer = <DataTransfer>(evt.target);
    if (target.files.length !== 1) throw new Error('Solo se permite un archivo a la vez');
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      const bstr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });
      const wsname: string = wb.SheetNames[0];
      const ws: XLSX.WorkSheet = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

      // Reset
      this.origenesUnicos = [];
      this.contactosPorOrigen = {};
      this.mensajesPorOrigen = {};

      data.forEach((row: any) => {
        const origen = row['Origen de Lead'] || '';
        const nombre = row['nombre'] || '';
        const celular = row['celular'] || '';
        if (origen && nombre && celular) {
          if (!this.contactosPorOrigen[origen]) {
            this.contactosPorOrigen[origen] = [];
            this.origenesUnicos.push(origen);
          }
          this.contactosPorOrigen[origen].push({ nombre, celular });
        }
      });
      // Aquí puedes mostrar dinámicamente un campo de mensaje para cada origen
      console.log('Origenes únicos:', this.origenesUnicos);
      console.log('Contactos por origen:', this.contactosPorOrigen);
    };
    reader.readAsBinaryString(target.files[0]);
  }
}
