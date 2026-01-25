<div align="center">
  <h1>NOXISTENCE</h1>
  <p>Creature and Content Management Platform</p>
  
  [![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)
  [![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
  [![Vite](https://img.shields.io/badge/Vite-4.x-646CFF.svg)](https://vitejs.dev/)
</div>

> ⚠️ **Important Notice**: This website and its content are protected under the [CC BY-NC-ND 4.0](LICENSE.txt) license. Any commercial use, modification, or redistribution is strictly prohibited without express written permission from the author.
<div align="center">
  <p>To know more about project visit this <a href="https://blackars.com/projects/noxistence-website">blog</a> </p>
</div>
## 🌟 Key Features

- **🎨 Modern UI** - Smooth animations and responsive minimalistic design
- **🦄 Creature Management** - Full CRUD operations for creatures
- **📚 Content System** - Organize lore and collections
- **🖼️ 3D Visualization** - Powered by Three.js
- **☁️ Cloud Integration** - Cloudinary for asset management
- **🛡️ Authentication** - Secure access control
- **🔍 Search & Filter** - Find content easily
- **📱 Responsive** - Works on all devices

## 🛠️ Tech Stack

### Frontend
- **Vite** - Next-gen frontend tooling
- **Three.js** - 3D graphics rendering
- **GSAP** - Professional-grade animations
- **Lenis** - Buttery smooth scrolling

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **Cloudinary** - Media management

### DevOps
- **Docker** - Containerization
- **GitHub Actions** - CI/CD
- **Google Cloud Run** - Deployment

## System Architecture Diagram

[![System Architecture Diagram](https://res.cloudinary.com/dgff8o52c/image/upload/NOXISTENCE_Main_Website_Architeture_qljcby.jpg)]

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or later
- npm 9.x or later
- Cloudinary account (for media)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/blackars/NOXISTENCE-site.git
   cd NOXISTENCE-site
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment**
   Create a `.env` file in the root directory:
   ```env
   # Server
   PORT=3100
   NODE_ENV=development
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

4. **Start development server**
   ```bash
   # Frontend + Backend
   npm run dev
   
   # Backend only
   npm start
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:3100

## 🐳 Docker Deployment

1. **Build the image**
   ```bash
   docker-compose build
   ```

2. **Start containers**
   ```bash
   docker-compose up -d
   ```

3. **View logs**
   ```bash
   docker-compose logs -f
   ```

## 🔧 API Reference

### Creatures
- `GET /api/creatures` - List all creatures
- `POST /api/upload` - Upload new creature
- `GET /api/creature/:id` - Get creature details

### Content
- `GET /api/data/lore` - Get lore content
- `GET /api/data/catalog` - Get catalog
- `GET /api/data/fonts` - List available fonts

### Utilities
- `POST /api/generate-all-thumbnails` - Generate thumbnails
- `GET /api/list-fonts` - List installed fonts

## 📄 License

This project is licensed under the **Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International** (CC BY-NC-ND 4.0) license.

### You are free to:
- **Share** — redistribute the final product in any medium or format

### Under the following terms:
- **Attribution** — You must give appropriate credit
- **NonCommercial** — No commercial use without permission
- **NoDerivatives** — No modifications allowed

For full details, see the [LICENSE](LICENSE.txt) file.

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://blackars.com">Blackars</a></sub>
</div>
