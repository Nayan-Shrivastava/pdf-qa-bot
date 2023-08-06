import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PineconeStore } from 'langchain/vectorstores';
import { OpenAIEmbeddings } from 'langchain/embeddings';
import { VectorDBQAChain } from 'langchain/chains';
import { ChatOpenAI } from 'langchain/chat_models';
import { ConfigService } from '@nestjs/config';
import { PineconeClient } from '@pinecone-database/pinecone';
import { PDFLoader } from 'langchain/document_loaders';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { existsSync } from 'fs';

@Injectable()
export class ChatService {
  constructor(private readonly configService: ConfigService) {
    this.initPinecone();
  }

  // The Pinecone index for storing embeddings
  private pineconeIndex;

  /**
   * Initialize Pinecone database connection
   */
  async initPinecone() {
    try {
      const client = new PineconeClient();
      await client.init({
        apiKey: this.configService.get('PINECONE_API_KEY'),
        environment: this.configService.get('PINECONE_ENV'),
      });

      // Store the Pinecone index
      this.pineconeIndex = await client.Index(
        this.configService.get('PINECONE_INDEX'),
      );
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Ask a question and get a response.
   * @param question The question to ask.
   * @returns The response text and the source document if available.
   * @throws BadRequestException if the question is missing or too long.
   * @throws InternalServerErrorException if there's an internal server error.
   */
  async askQuestion(question: string) {
    if (!question) {
      throw new BadRequestException('Missing text');
    }
    if (question.length > 200) {
      throw new BadRequestException('Text too long');
    }

    try {
      // Initialize OpenAI embeddings
      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: this.configService.get('OPENAI_API_KEY'),
      });

      // Initialize Pinecone store with existing index
      const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex: this.pineconeIndex,
      });

      // Initialize Chat model with OpenAI API key and model name
      const model = new ChatOpenAI({
        temperature: 0.9,
        openAIApiKey: this.configService.get('OPENAI_API_KEY'),
        modelName: 'gpt-3.5-turbo',
      });

      // Initialize the QA chain with the model and vector store
      const chain = VectorDBQAChain.fromLLM(model, vectorStore, {
        k: 5,
        returnSourceDocuments: true,
      });

      // Get the response from the chain based on the question
      const response = await chain.call({ query: question });
      const { text: responseText, sourceDocuments } = response;

      return {
        text: responseText,
        source: sourceDocuments[0]?.pageContent ?? 'No source document found',
      };
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  /**
   * Load a PDF file and create embeddings for it.
   * @param fileName The name of the PDF file to load.
   * @returns A success message if the PDF is loaded successfully.
   * @throws BadRequestException if the file does not exist.
   * @throws Error if there's an error during PDF loading or embedding creation.
   */
  async loadPDF(fileName: string) {
    try {
      // Check if the file exists
      if (!existsSync(`./pdf/${fileName}`)) {
        throw new BadRequestException('File does not exist.');
      }

      // Load the PDF using PDFLoader
      const pdfLoader = new PDFLoader(`./pdf/${fileName}`);
      const pdf = await pdfLoader.load();
      console.log('loaded pdf with length', pdf.length);

      // Split the PDF into texts using RecursiveCharacterTextSplitter
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 50,
      });
      const texts = await textSplitter.splitDocuments(pdf);
      let embeddings = [];

      // Split each page's content into embeddings and concatenate them
      for (let index = 0; index < texts.length; index++) {
        const page = texts[index];
        const data = await textSplitter.splitText(page.pageContent);
        embeddings = embeddings.concat(data);
      }

      // Initialize OpenAI embeddings for embedding creation
      const embeddingModel = new OpenAIEmbeddings({
        maxConcurrency: 5,
        openAIApiKey: this.configService.get('OPENAI_API_KEY'),
      });

      console.log(embeddings);

      // Create and store embeddings in Pinecone store
      await PineconeStore.fromTexts(embeddings, [], embeddingModel, {
        pineconeIndex: this.pineconeIndex,
      });

      console.log(`uploaded embeddings to pinecone DB ${this.pineconeIndex}`);

      return { message: 'pdf is loaded', status: 'success' };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
