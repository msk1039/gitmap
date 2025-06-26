# gitmap - Local Git Repository Manager

Never lose track of your Git repositories again. gitmap scans your entire disk, finds all your Git repositories, and gives you instant access to open them in VS Code or your file manager. No more hunting through folders.



<!-- https://github.com/user-attachments/assets/32746ca4-4295-482f-9bf6-875130fe4a64 -->
https://res.cloudinary.com/dvdcl3ozp/video/upload/v1750968418/projects/gitfinder/demo-videos/Screen_Recording_2025-06-27_at_1.31.06_AM_x7ajf5.mov


## Features

### 🔍 Full Disk Discovery
Automatically discovers all Git repositories in the selected directory (added maximum search depth of 8 for safety).
Ignores typicals build/dependancy folders like .next, node_modules, dist etc for efficiency 

### 🚀 One-Click Access
Open repositories directly in:
- **VS Code** - Jump straight into your code editor
- **File Manager** - Browse files in your system's default file explorer
- **Repository Detail** - View comprehensive repository information

### 💾 Smart Caching
Scan results are cached locally in JSON format. No need to rescan every time you open the app. lightning-fast startup after initial scan.

### 📈 Rich Metadata
See comprehensive repository information at a glance:
- Current branch name
- Total commit count
- Repository size (MB/GB)
- Last commit date
- File type distribution
- Repository validity status

### 🌐 Cross-Platform
Works seamlessly on macOS, Windows, and Linux.

### ⚡ Instant Search & Filter
Find any repository instantly with powerful search functionality. Filter by repository name with real-time results as you type.



## Setup & Installation

### Prerequisites
- **Node.js** (v16 or higher)
- **Rust** (latest stable version)
- **pnpm or npm**

### Development Setup

#### 1. Clone the Repository
```bash
git clone <repository-url>
cd gitmap
```

#### 2. Install Dependencies
```bash
# Using pnpm (recommended)
pnpm install

# Using npm
npm install
```

#### 3. Install Tauri CLI
```bash
# Using pnpm
pnpm add -D @tauri-apps/cli

# Using npm
npm install -D @tauri-apps/cli
```

#### 4. Development Mode
```bash
# Start development server
pnpm tauri dev

# Or with npm
npm run tauri dev
```

### Building for Production

#### All Platforms
```bash
# Build for your current platform
pnpm tauri build

# Or with npm
npm run tauri build
```

#### Platform-Specific Builds

**macOS:**
```bash
# Requires macOS system
pnpm tauri build --target universal-apple-darwin
```

**Windows:**
```bash
# Requires Windows system or cross-compilation setup
pnpm tauri build --target x86_64-pc-windows-msvc
```

**Linux:**
```bash
# Requires Linux system
pnpm tauri build --target x86_64-unknown-linux-gnu
```

### Cross-Platform Build Requirements

- **macOS**: Xcode Command Line Tools
- **Windows**: Microsoft C++ Build Tools or Visual Studio
- **Linux**: Standard build tools (gcc, pkg-config, etc.)

## Project Structure

```
├── src/                    # React frontend
│   ├── components/         # React components
│   ├── pages/             # Application pages
│   ├── hooks/             # Custom React hooks
│   └── types/             # TypeScript definitions
├── src-tauri/             # Rust backend
│   ├── src/               # Rust source code
│   └── Cargo.toml         # Rust dependencies
└── public/                # Static assets
```

## Technologies Used

- **Frontend**: React + TypeScript + Vite
- **Backend**: Rust + Tauri
- **UI**: Tailwind CSS + shadcn/ui
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Package Manager**: pnpm


