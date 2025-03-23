const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { globSync } = require('glob');
const { splitIntoChunks } = require('./splitIntoChunks');

/* SAMPLE CODE:

const vs = new VectorStore(openaiClient, "nomic-embed-text");
vs.initializeFromDirectory("../docs");

const query = "What is the capital of France?";
const results = vs.search(query);
console.log(results);
*/

// VectorStore class for managing document embeddings and similarity search
class VectorStore
{
  // Create a new VectorStore instance
  //  @param {OpenAI} openaiClient - The OpenAI client for generating embeddings
  //  @param {string} embeddingModelName - The name of the embedding model to use
  constructor(openaiClient, embeddingModelName) {
    this.store = {};
    this.openaiClient = openaiClient;
    this.embeddingModelName = embeddingModelName || "nomic-embed-text";
    this.log(`Using embedding model: ${this.embeddingModelName}`);
  }

  // Initialize the document store from a directory of markdown files
  //  @param {string} directoryPath - Path to the directory containing markdown documents
  async initializeFromDirectory(directoryPath) {
    this.log('Initializing document store...');
    this.log('Using in-memory vector store');

    // Load documents from the docs directory
    const docFiles = globSync('**/*.md', { cwd: directoryPath });

    this.log(`Found ${docFiles.length} documents to index`);

    for (const file of docFiles) {
      const filePath = path.join(directoryPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Create chunks from the content
      const chunks = splitIntoChunks(content);

      this.log(`Processing ${file}: ${chunks.length} chunks`);

      // Get embeddings for chunks
      const embeddings = await this.getEmbeddings(chunks);

      // Add documents to in-memory store
      for (let i = 0; i < chunks.length; i++) {
        const id = uuidv4();
        this.store[id] = {
          document: chunks[i],
          embedding: embeddings[i],
          // We can add other metadata here if needed
          metadata: { source: file }
        };
      }
    }

    this.log('Documents indexed successfully');
  }

  // Add a document to the vector store
  //  @param {string} text - Document text
  //  @param {Object} metadata - Document metadata
  //  @returns {string} - Document ID
  async addDocument(text, metadata = {}) {
    const chunks = splitIntoChunks(text);
    const embeddings = await this.getEmbeddings(chunks);

    const ids = [];
    for (let i = 0; i < chunks.length; i++) {
      const id = uuidv4();
      this.store[id] = {
        document: chunks[i],
        embedding: embeddings[i],
        metadata
      };
      ids.push(id);
    }

    return ids.length === 1 ? ids[0] : ids;
  }

  // Get the size of the vector store
  //  @returns {number} - Number of documents in the store
  size() {
    return Object.keys(this.store).length;
  }

  // Check if the vector store is empty
  //  @returns {boolean} - True if the store is empty
  isEmpty() {
    return this.size() === 0;
  }

  // Generate embeddings for an array of texts
  //  @param {string[]} texts - Array of text chunks
  //  @returns {number[][]} - Array of embedding vectors
  //  @note Embeddings are vectors of numbers, which are used to
  //        represent the text in a vector space.
  async getEmbeddings(texts) {
    const embeddings = [];

    for (const text of texts) {
      const response = await this.openaiClient.embeddings.create({
        model: this.embeddingModelName,
        input: text,
      });

      embeddings.push(response.data[0].embedding);
    }

    return embeddings;
  }

  // Calculate cosine similarity between two vectors
  //  @param {number[]} vecA - First vector
  //  @param {number[]} vecB - Second vector
  //  @returns {number} - Similarity score (0-1)
  //  @see https://builtin.com/machine-learning/cosine-similarity
  //  @see https://en.wikipedia.org/wiki/Cosine_similarity
  //  @note Like lighting calculation in 3D graphics !
  cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magA * magB);
  }

  // Search for similar documents using an embedding
  //  @param {number[]} queryEmbedding - Embedding vector for the query
  //  @param {number} topK - Number of top results to return
  //  @returns {Object} - Search results with documents, scores, and metadata
  searchByEmbedding(queryEmbedding, topK = 3) {
    if (this.isEmpty()) {
      return { documents: [], scores: [], metadatas: [] };
    }

    // Calculate similarity scores
    const results = Object.entries(this.store).map(([id, item]) => {
      const similarity = this.cosineSimilarity(queryEmbedding, item.embedding);
      return {
        id,
        document: item.document,
        metadata: item.metadata,
        score: similarity
      };
    });

    // Sort by similarity score (highest first)
    results.sort((a, b) => b.score - a.score);

    // Take topK results
    const topResults = results.slice(0, topK);

    return {
      documents: topResults.map(r => r.document),
      scores: topResults.map(r => r.score),
      metadatas: topResults.map(r => r.metadata)
    };
  }

  // Search for similar documents using a text query
  //  @param {string} query - Text query
  //  @param {number} topK - Number of top results to return
  //  @returns {Promise<Object>} - Search results with documents, scores, and metadata
  async search(query, topK = 3) {
    // Generate embedding for the query
    const queryEmbedding = await this.getEmbeddings([query]);

    // Search using the embedding
    return this.searchByEmbedding(queryEmbedding[0], topK);
  }

  log(message) {
    console.log(`[VectorStore] ${message}`);
  }
}

module.exports = { VectorStore };