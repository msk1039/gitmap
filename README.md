# gitmap - Local Git Repository Manager
A smart tool to discover, organize, and clean your local Git projects.

No more manually digging through folders or trying to remember where you cloned that one project last month. GitMap helps you stay organized and keeps your workspace clean by also letting you delete unused node_modules with a single click.


<!-- https://github.com/user-attachments/assets/32746ca4-4295-482f-9bf6-875130fe4a64 -->
<!-- https://res.cloudinary.com/dvdcl3ozp/video/upload/v1750968418/projects/gitfinder/demo-videos/Screen_Recording_2025-06-27_at_1.31.06_AM_x7ajf5.mov  -->


https://github.com/user-attachments/assets/98e7dcab-b82b-4838-b449-3d9ad6a4ed55




## Features

- ### Auto-discovers all Git repositories on your system
- ### Pin frequently used repositories for quick access
- ### Group related projects into custom collections
- ### Delete unused node_modules from non-active projects to free up disk space

## Setup & Installation

### Prerequisites

Before you can develop or build this application, you need to install the following system dependencies based on your operating system:

#### System Dependencies

**Windows:**
1. **Microsoft C++ Build Tools** ( please refer to https://v2.tauri.app/start/prerequisites/ for more details)
   - Download the [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) installer
   - During installation, check the "Desktop development with C++" option
   
2. **WebView2** (Windows 10 version 1803+ already has this installed)
   - If needed, download from [WebView2 Runtime download section](https://developer.microsoft.com/en-us/microsoft-edge/webview2/#download-section)
   - Install the "Evergreen Bootstrapper"

**macOS:**
- **Xcode** Command Line Tools
    - ```xcode-select --install```
  

**Linux (Debian/Ubuntu):**
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

**Linux (Arch):**
```bash
sudo pacman -S webkit2gtk-4.1 base-devel curl wget file xdotool openssl \
  libayatana-appindicator librsvg
```

**Linux (Fedora):**
```bash
sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file \
  libxdo-devel \
  @development-tools
```

#### Rust Installation

**Windows:**
1. Download and run [rustup-init.exe](https://forge.rust-lang.org/infra/channel-layout.html#rustup)
2. Follow the installation prompts
3. Restart your terminal/command prompt

**macOS & Linux:**
```bash
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
```
Restart your terminal after installation.

#### Node.js (Optional - only if using JavaScript frontend)
- Download and install the LTS version from [Node.js website](https://nodejs.org/)
- Verify installation:
```bash
node -v  # Should show v20.x.x or higher
npm -v   # Should show version number
```

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

#### Build for Current Platform
```bash
# Build for your current platform
pnpm tauri build

# Or with npm
npm run tauri build
```

#### Cross-Platform Builds

**Note:** Cross-compilation is complex and generally requires the target platform for optimal results.

**macOS (Universal Binary):**
```bash
# Requires macOS system
pnpm tauri build --target universal-apple-darwin
```

**Windows:**
```bash
# Requires Windows system
pnpm tauri build --target x86_64-pc-windows-msvc
```

**Linux:**
```bash
# Requires Linux system
pnpm tauri build --target x86_64-unknown-linux-gnu
```

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


