import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { MessagesComponent } from './features/messages/messages.component';
import { BroadcastComponent } from './features/broadcast/broadcast.component';
import { ContactsComponent } from './features/contacts/contacts.component';
import { SettingsComponent } from './features/settings/settings.component';
import { MessageSendComponent } from './features/message-send/message-send.component';
import { FlowsComponent } from './features/flows/flows.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent, data: { title: 'Dashboard' } },
  { 
    path: 'messages', 
    children: [
      { path: '', component: MessagesComponent, data: { title: 'Mensajes' } },
      { path: 'new', component: MessageSendComponent, data: { title: 'Nuevo Mensaje' } },
      { path: '**', redirectTo: '' }
    ]
  },
  { path: 'broadcast', component: BroadcastComponent, data: { title: 'Difusión' } },
  { path: 'contacts', component: ContactsComponent, data: { title: 'Contactos' } },
  { path: 'settings', component: SettingsComponent, data: { title: 'Configuración' } },
  { path: 'flows', component: FlowsComponent, data: { title: 'Flujos' } },
];
