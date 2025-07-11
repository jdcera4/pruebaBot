import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageSendComponent } from './message-send/message-send.component';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { SharedModule } from '../shared/shared.module';
import { BroadcastComponent } from './broadcast/broadcast.component';

@NgModule({
  declarations: [
    MessageSendComponent,
    BroadcastComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    SharedModule
  ],
  exports: [
    MessageSendComponent,
    BroadcastComponent
  ]
})
export class FeaturesModule { }
