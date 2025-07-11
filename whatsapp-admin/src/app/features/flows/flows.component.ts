import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FlowEditComponent } from './flow-edit.component';

interface Flow {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  steps: Step[];
}

interface Step {
  id: string;
  message: string;
  isFinal: boolean;
  options: Option[];
}

interface Option {
  id: string;
  label: string;
  nextStepId: string | null;
  responseMessage?: string;
}

@Component({
  selector: 'app-flows',
  standalone: true,
  imports: [CommonModule, FlowEditComponent],
  templateUrl: './flows.component.html',
  styleUrls: ['./flows.component.css']
})
export class FlowsComponent implements OnInit {
  flows: Flow[] = [];
  loading = false;
  error = '';
  showModal = false;
  editingFlow: Flow | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchFlows();
  }

  fetchFlows() {
    this.loading = true;
    this.http.get<Flow[]>('/api/flows').subscribe({
      next: (data) => {
        this.flows = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar flujos';
        this.loading = false;
      }
    });
  }

  openModal(flow: Flow | null = null) {
    this.editingFlow = flow;
    this.showModal = true;
  }

  closeModal(refresh: boolean = false) {
    this.showModal = false;
    this.editingFlow = null;
    if (refresh) this.fetchFlows();
  }

  onEdit(flow: Flow) {
    this.openModal(flow);
  }

  onNew() {
    this.openModal();
  }

  onDelete(flow: Flow) {
    if (confirm('¿Seguro que deseas eliminar este flujo?')) {
      this.loading = true;
      this.http.delete(`/api/flows/${flow.id}`).subscribe({
        next: () => {
          this.fetchFlows();
        },
        error: () => {
          this.error = 'Error al eliminar flujo';
          this.loading = false;
        }
      });
    }
  }
}
