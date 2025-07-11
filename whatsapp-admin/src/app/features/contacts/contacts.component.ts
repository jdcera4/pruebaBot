import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WhatsappService, Contact } from '../../core/services/whatsapp.service';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contacts.component.html',
  styleUrls: ['./contacts.component.scss']
})
export class ContactsComponent implements OnInit {
  getInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  contacts: Contact[] = [];
  isLoading = true;
  errorMsg = '';
  page = 1;
  limit = 10;
  total = 0;
  pages = 1;
  search = '';

  constructor(private whatsappService: WhatsappService) {}

  ngOnInit(): void {
    this.loadContacts();
  }

  loadContacts(page: number = this.page, search: string = this.search): void {
    this.isLoading = true;
    this.whatsappService.getContactsPaginated(page, this.limit, search).subscribe({
      next: (res) => {
        this.contacts = res.data;
        this.page = res.pagination.page;
        this.limit = res.pagination.limit;
        this.total = res.pagination.total;
        this.pages = res.pagination.pages;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMsg = 'Error al cargar contactos';
        this.isLoading = false;
      }
    });
  }

  onSearch(term: string): void {
    this.search = term;
    this.page = 1;
    this.loadContacts(this.page, this.search);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.pages) return;
    this.page = page;
    this.loadContacts(this.page, this.search);
  }
}
