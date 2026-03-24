import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { ChatbotService } from '../../services/chatbot.service';
import { AuthService } from '../../services/auth.service';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.page.html',
  styleUrls: ['./chatbot.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    FormsModule
  ]
})
export class ChatbotPage implements OnInit {
  @ViewChild('chatContainer') chatContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  messages: Message[] = [];
  inputMessage: string = '';
  isLoading: boolean = false;
  driverId: number = 0;
  isOllamaConnected: boolean = false;

  suggestedQuestions = [
    '📦 Combien de livraisons me restent-elles ?',
    '📍 Où est ma prochaine livraison ?',
    '🗺️ Statut de mon trajet actuel ?',
    '🔔 Notifications non lues ?',
    '🕐 Quelle heure est-il ?',
    '💡 Donne-moi un conseil de conduite'
  ];

  constructor(
    private chatbotService: ChatbotService,
    private authService: AuthService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    const user = this.authService.currentUser();
    this.driverId = (user as any)?.driverId || (user as any)?.id || 0;
    
    // Check Ollama connection
    this.checkOllamaConnection();
    
    // Add welcome message
    this.addMessage('assistant', 
      '👋 **Bonjour!** Je suis votre assistant IA personnel.\n\n' +
      'Je peux vous aider avec :\n' +
      '• Vos trajets et livraisons\n' +
      '• Les notifications\n' +
      '• L\'heure et la date\n' +
      '• Des conseils de conduite\n' +
      '• Des questions générales\n\n' +
      '💬 Posez-moi une question!');
    
    // Load suggested questions
    this.loadSuggestions();
  }

  async checkOllamaConnection() {
    try {
      const response = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      this.isOllamaConnected = response.ok;
      if (this.isOllamaConnected) {
        console.log('✅ Ollama connected - AI assistant ready');
      }
    } catch (error) {
      this.isOllamaConnected = false;
      console.log('⚠️ Ollama not connected - Using intelligent fallback mode');
    }
  }

  async loadSuggestions() {
    try {
      const suggestions = await this.chatbotService.getSuggestions();
      this.suggestedQuestions = suggestions;
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  }

  addMessage(role: 'user' | 'assistant', content: string, isTyping: boolean = false) {
    this.messages.push({
      role,
      content,
      timestamp: new Date(),
      isTyping
    });

    // Scroll to bottom
    setTimeout(() => {
      this.scrollToBottom();
    }, 100);
  }

  scrollToBottom() {
    if (this.chatContainer) {
      this.chatContainer.nativeElement.scrollTop =
        this.chatContainer.nativeElement.scrollHeight;
    }
  }

  autoResize(event: any) {
    const element = event.target;
    element.style.height = 'auto';
    element.style.height = (element.scrollHeight) + 'px';
  }

  async sendMessage() {
    if (!this.inputMessage.trim() || this.isLoading) return;

    const userMessage = this.inputMessage.trim();
    this.inputMessage = '';
    
    // Add user message
    this.addMessage('user', userMessage);
    this.isLoading = true;

    // Add typing indicator
    this.addMessage('assistant', '...', true);
    this.scrollToBottom();

    try {
      // Get response from chatbot
      const response = await this.chatbotService.sendMessage({
        driverId: this.driverId,
        message: userMessage,
        conversationHistory: this.messages.slice(-10)
      });

      // Remove typing indicator
      this.messages.pop();

      // Add bot response
      this.addMessage('assistant', response.message);

      // Show context if available
      if (response.context) {
        console.log('📊 Context:', response.context);
      }

    } catch (error) {
      console.error('Chatbot error:', error);
      
      // Remove typing indicator
      this.messages.pop();
      
      // Add error message
      this.addMessage('assistant', 
        '❌ Désolé, je rencontre un problème technique. Veuillez réessayer dans quelques instants.');
      
      // Show toast
      const toast = await this.toastController.create({
        message: 'Erreur de connexion au chatbot',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }

    this.isLoading = false;
  }

  async sendSuggestion(question: string) {
    this.inputMessage = question;
    await this.sendMessage();
  }

  clearChat() {
    this.messages = [{
      role: 'assistant',
      content: '👋 **Conversation effacée.** Comment puis-je vous aider?',
      timestamp: new Date()
    }];
  }
}