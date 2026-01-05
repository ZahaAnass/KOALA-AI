# KOALA AI 🐨

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![React Version](https://img.shields.io/badge/react-19.0.0--rc-blue)](https://react.dev)

A modern AI chatbot application powered by Google Gemini, featuring real-time conversations, image analysis, and a beautiful user interface.

## 📸 Screenshots

![Home Page](./client/public/Home.png)
![Chat Interface](./client/public/Chat.png)
![Dashboard](./client/public/Dashboard.png)

## ✨ Features

- 🤖 **AI-Powered Conversations** - Chat with Google Gemini AI in real-time
- 🖼️ **Image Analysis** - Upload and analyze images with AI
- 🔐 **Secure Authentication** - User authentication powered by Clerk
- 💾 **Persistent History** - All conversations are saved and accessible
- 📱 **Responsive Design** - Modern UI built with TailwindCSS
- ⚡ **Fast & Efficient** - Built with React 19 and Vite

## 🛠️ Tech Stack

### Frontend
- **React 19 (RC)** - UI framework
- **React Router DOM v7** - Routing
- **TailwindCSS v4** - Styling
- **Vite** - Build tool
- **Clerk** - Authentication
- **TanStack React Query** - Data fetching and caching
- **React Markdown** - Message formatting
- **ImageKit** - Image hosting and optimization

### Backend
- **Node.js 18+** - Runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **MongoDB** - Database
- **Mongoose** - ODM
- **Clerk SDK** - Authentication
- **Google Generative AI** - AI integration

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js 18 or higher
- npm or yarn
- MongoDB (local or MongoDB Atlas account)

You'll also need accounts for:
- [Clerk](https://clerk.com) - For authentication
- [ImageKit](https://imagekit.io) - For image hosting
- [Google AI Studio](https://makersuite.google.com/app/apikey) - For Gemini API key

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/ZahaAnass/KOALA-AI.git
cd KOALA-AI
```

### 2. Set up the Backend

```bash
cd server
npm install
```

Create a `.env` file in the server directory:

```env
# ImageKit Configuration
IMAGE_KIT_END_POINT=your_imagekit_endpoint
IMAGE_KIT_PUBLIC_KEY=your_imagekit_public_key
IMAGE_KIT_PRIVATE_KEY=your_imagekit_private_key

# Server Configuration
CLIENT_URL=http://localhost:5173

# MongoDB Configuration
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/koala-ai?retryWrites=true&w=majority

# Clerk Configuration
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

Start the development server:

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### 3. Set up the Frontend

Open a new terminal and navigate to the client directory:

```bash
cd client
npm install
```

Create a `.env` file in the client directory:

```env
# Clerk Configuration
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# ImageKit Configuration
VITE_IMAGE_KIT_END_POINT=your_imagekit_endpoint
VITE_IMAGE_KIT_PUBLIC_KEY=your_imagekit_public_key

# Google Gemini Configuration
VITE_GEMINI_PUBLIC_KEY=your_gemini_api_key
```

Start the development server:

```bash
npm run dev
```

The app will open at `http://localhost:5173`

## 🔧 Configuration

### Clerk Setup
1. Create an account at [Clerk](https://clerk.com)
2. Create a new application
3. Copy the Publishable Key and Secret Key
4. Add `http://localhost:5173` to allowed origins

### ImageKit Setup
1. Create an account at [ImageKit](https://imagekit.io)
2. Get your URL endpoint, Public Key, and Private Key from the dashboard
3. Add the keys to your environment files

### Google Gemini API Setup
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Add it to your client `.env` file

### MongoDB Setup
1. Create a MongoDB Atlas account or use a local MongoDB instance
2. Create a new cluster (for Atlas)
3. Create a database user with read/write permissions
4. Get your connection string
5. Replace `username`, `password`, and `cluster` in the MONGO_URI

## 📦 Building for Production

### Build the Backend

```bash
cd server
npm run build
npm start
```

### Build the Frontend

```bash
cd client
npm run build
```

The built files will be in the `dist` directory.

## 📖 API Documentation

### Endpoints

#### Chat Routes
- `POST /api/chats` - Create a new chat
- `GET /api/chats/:id` - Get a specific chat
- `PUT /api/chats/:id` - Update a chat

#### User Chats Routes
- `GET /api/userchats` - Get all chats for the authenticated user

#### Upload Routes
- `GET /api/upload` - Get ImageKit authentication parameters

For detailed API documentation, see [API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md)

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](./CONTRIBUTING.md) before submitting a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- [Google Gemini](https://deepmind.google/technologies/gemini/) - AI capabilities
- [Clerk](https://clerk.com) - Authentication solution
- [ImageKit](https://imagekit.io) - Image management
- [MongoDB](https://www.mongodb.com) - Database solution

## 👤 Author

**Anass Zaha**

- GitHub: [@ZahaAnass](https://github.com/ZahaAnass)

## 📞 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Check the [documentation](./docs)
- Review the [FAQ](./docs/FAQ.md)

## 🗺️ Roadmap

- [ ] Voice/audio chat support
- [ ] Multi-model AI support
- [ ] Collaborative features
- [ ] Mobile applications
- [ ] Enhanced analytics dashboard

---

Made with ❤️ by Anass Zaha
