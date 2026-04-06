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
  
  // Voice features
  voiceModeEnabled: boolean = false; // AI speaks responses
  isRecording: boolean = false;
  isListening: boolean = false;
  private recognition: any;
  private synthesis: SpeechSynthesis;

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
  ) {
    this.synthesis = window.speechSynthesis;
    this.initSpeechRecognition();
  }

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

      // Speak the response if voice mode is enabled
      setTimeout(() => {
        this.speak(response.message);
      }, 500);

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
    this.stopSpeaking();
  }

  // ============================================
  // VOICE FEATURES - Speech Recognition & Synthesis
  // ============================================

  /**
   * Initialize speech recognition (voice input)
   */
  private initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'fr-FR';

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('🎤 Voice input:', transcript);
        this.inputMessage = transcript;
        this.isRecording = false;
        this.isListening = false;
        // Auto-send after voice input
        setTimeout(() => this.sendMessage(), 500);
      };

      this.recognition.onerror = (event: any) => {
        console.error('🎤 Speech recognition error:', event.error);
        this.isRecording = false;
        this.isListening = false;
      };

      this.recognition.onend = () => {
        console.log('🎤 Speech recognition ended');
        this.isRecording = false;
        this.isListening = false;
      };

      console.log('✅ Speech recognition initialized');
    } else {
      console.warn('⚠️ Speech recognition not supported');
    }
  }

  /**
   * Toggle voice input (speech-to-text)
   */
  toggleVoiceInput() {
    if (!this.recognition) {
      this.presentToast('Reconnaissance vocale non supportée', 'warning');
      return;
    }

    if (this.isRecording) {
      this.recognition.stop();
      this.isRecording = false;
    } else {
      try {
        this.recognition.start();
        this.isRecording = true;
        this.isListening = true;
        this.presentToast('🎤 Parlez maintenant...', 'primary');
      } catch (error) {
        console.error('Error starting recognition:', error);
        this.presentToast('Erreur microphone', 'danger');
      }
    }
  }

  /**
   * Toggle voice mode (text-to-speech for responses)
   */
  toggleVoiceMode() {
    this.voiceModeEnabled = !this.voiceModeEnabled;
    this.presentToast(
      this.voiceModeEnabled ? '🔊 Mode vocal activé' : '🔇 Mode vocal désactivé',
      'primary'
    );
  }

  /**
   * Speak text using text-to-speech
   */
  private speak(text: string) {
    if (!this.voiceModeEnabled || !text) return;

    // Stop any ongoing speech
    this.stopSpeaking();

    // Clean text (remove emojis and markdown)
    const cleanText = text
      .replace(/📦|📍|🗺️|🔔|🕐|💡|❌|👋/g, '')
      .replace(/\*\*/g, '')
      .replace(/\n/g, ' ')
      .trim();

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        console.log('🔊 Speaking...');
      };

      utterance.onend = () => {
        console.log('🔊 Speech ended');
      };

      utterance.onerror = (event) => {
        console.error('Speech error:', event);
      };

      this.synthesis.speak(utterance);
    }
  }

  /**
   * Stop current speech
   */
  private stopSpeaking() {
    if ('speechSynthesis' in window) {
      this.synthesis.cancel();
    }
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color
    });
    await toast.present();
  }
}