import { Component } from '@angular/core';

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
  standalone: false
})
export class Tab4Page {
  activeChat: number | null = null;
  messageInput = '';
  searchText = '';

  conversations = [
    {
      id: 1,
      name: 'Carlos Mendes',
      lastMessage: 'Aceito a troca! Quando podemos combinar?',
      time: '10:23',
      unread: 2,
      avatar: '👤',
    },
    {
      id: 2,
      name: 'Ana Rodrigues',
      lastMessage: 'Essa moeda está em excelente estado',
      time: 'Ontem',
      unread: 1,
      avatar: '👤',
    },
    {
      id: 3,
      name: 'Pedro Santos',
      lastMessage: 'Obrigado pela informação!',
      time: '2 dias',
      unread: 0,
      avatar: '👤',
    },
  ];

  chatMessages = [
    {
      id: 1,
      sender: 'other',
      text: 'Olá! Tenho interesse na sua moeda Denário Romano.',
      time: '09:45',
    },
    {
      id: 2,
      sender: 'other',
      text: 'Posso oferecer este Escudo Português em troca',
      time: '09:46',
      coinPreview: {
        title: 'Escudo Português 1731',
        condition: 'MBC',
        value: '€420',
      },
    },
    {
      id: 3,
      sender: 'me',
      text: 'Olá Carlos! Deixe-me ver as fotografias do Escudo.',
      time: '10:12',
    },
    {
      id: 4,
      sender: 'other',
      text: 'Aqui estão as fotos. O estado é muito bom!',
      time: '10:15',
      hasImages: true,
    },
    {
      id: 5,
      sender: 'me',
      text: 'Parece-me justo. Aceito a troca!',
      time: '10:20',
    },
    {
      id: 6,
      sender: 'other',
      text: 'Aceito a troca! Quando podemos combinar?',
      time: '10:23',
    },
  ];

  get filteredConversations() {
    const filter = this.searchText?.toLowerCase().trim();
    if (!filter) {
      return this.conversations;
    }
    return this.conversations.filter((conversation) =>
      conversation.name.toLowerCase().includes(filter) ||
      conversation.lastMessage.toLowerCase().includes(filter)
    );
  }

  openChat(conversationId: number) {
    this.activeChat = conversationId;
  }

  clearChat() {
    this.activeChat = null;
  }

  sendMessage() {
    if (!this.messageInput.trim()) {
      return;
    }
    this.messageInput = '';
  }
}
