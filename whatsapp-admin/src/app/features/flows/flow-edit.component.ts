import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray, AbstractControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-flow-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './flow-edit.component.html',
  styleUrls: ['./flow-edit.component.css']
})
export class FlowEditComponent {
  @Input() flow: any = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  form: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      isActive: [true],
      steps: this.fb.array([])
    });
  }

  ngOnChanges() {
    if (this.flow) {
      this.form.patchValue({
        name: this.flow.name,
        description: this.flow.description,
        isActive: this.flow.isActive
      });
      this.setSteps(this.flow.steps || []);
    }
  }

  setSteps(steps: any[]) {
    const stepsFA = this.form.get('steps') as FormArray;
    stepsFA.clear();
    steps.forEach(step => {
      stepsFA.push(this.fb.group({
        id: [step.id],
        message: [step.message, Validators.required],
        isFinal: [step.isFinal],
        options: this.fb.array(step.options.map((opt: any) => this.fb.group({
          id: [opt.id],
          label: [opt.label, Validators.required],
          nextStepId: [opt.nextStepId],
          responseMessage: [opt.responseMessage]
        })))
      }));
    });
  }

  get steps() { return this.form.get('steps') as FormArray; }

  asFormGroup(ctrl: AbstractControl): FormGroup {
    return ctrl as FormGroup;
  }

  addStep() {
    this.steps.push(this.fb.group({
      id: [null],
      message: ['', Validators.required],
      isFinal: [false],
      options: this.fb.array([])
    }));
  }

  removeStep(idx: number) {
    this.steps.removeAt(idx);
  }

  stepOptions(stepIdx: number) {
    return (this.steps.at(stepIdx).get('options') as FormArray);
  }

  addOption(stepIdx: number) {
    this.stepOptions(stepIdx).push(this.fb.group({
      id: [null],
      label: ['', Validators.required],
      nextStepId: [null],
      responseMessage: ['']
    }));
  }

  removeOption(stepIdx: number, optIdx: number) {
    this.stepOptions(stepIdx).removeAt(optIdx);
  }

  saveFlow() {
    if (this.form.invalid) return;
    this.loading = true;
    const data = this.form.value;
    let req;
    if (this.flow && this.flow.id) {
      req = this.http.put(`/api/flows/${this.flow.id}`, data);
    } else {
      req = this.http.post('/api/flows', data);
    }
    req.subscribe({
      next: () => {
        this.loading = false;
        this.saved.emit();
      },
      error: () => {
        this.loading = false;
        this.error = 'Error al guardar el flujo';
      }
    });
  }
}
