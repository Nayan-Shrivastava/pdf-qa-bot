import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { FileNameDTO, QuestionDTO } from './chat.dto';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  /**
   * Handler for the GET /chat/ask-question endpoint.
   * Ask a question and get a response.
   * @param questionDTO The DTO containing the question to ask.
   * @returns A Promise with the response text and the source document if available.
   */
  @Get('ask-question')
  async askQuestion(
    @Query() questionDTO: QuestionDTO,
  ): Promise<{ text: string; source: string }> {
    // Delegate the request to the ChatService's askQuestion method
    return this.chatService.askQuestion(questionDTO.question);
  }

  /**
   * Handler for the POST /chat/load-pdf endpoint.
   * Load a PDF file and create embeddings for it.
   * @param fileNameDTO The DTO containing the name of the PDF file to load.
   * @returns A Promise with a success message if the PDF is loaded successfully.
   */
  @Post('load-pdf')
  async loadPDF(@Body() fileNameDTO: FileNameDTO) {
    // Delegate the request to the ChatService's loadPDF method
    return this.chatService.loadPDF(fileNameDTO.fileName);
  }
}
