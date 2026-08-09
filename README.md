# gitmap - Local Git Repository Manager
A desktop app to discover, organize, browse, and clean local Git projects.

No more manually digging through folders or trying to remember where you cloned that one project last month. gitmap organizes local repositories, previews their contents, and helps you reclaim space from reproducible build outputs.


<!-- https://github.com/user-attachments/assets/32746ca4-4295-482f-9bf6-875130fe4a64 -->
<!-- https://res.cloudinary.com/dvdcl3ozp/video/upload/v1750968418/projects/gitfinder/demo-videos/Screen_Recording_2025-06-27_at_1.31.06_AM_x7ajf5.mov  -->


https://github.com/user-attachments/assets/98e7dcab-b82b-4838-b449-3d9ad6a4ed55




## Features

- Auto-discovers Git repositories in configured scan locations
- Paginates large repository lists and supports pinned repositories and custom collections
- Shows workspace storage and cleanable-space statistics
- Safely reviews and deletes known reproducible artifacts, including `node_modules`, Rust `target`, `.next`, `.nuxt`, Python environments, and common build caches
- Browses repository files with GitHub-style breadcrumbs, folders, and line-numbered text previews
- Uses language icons for detected technologies
- Supports light and dark themes, with the choice persisted locally

## Setup & Installation

### Prerequisites

For system dependencies and Rust installation, please refer to the [official Tauri prerequisites documentation](https://v2.tauri.app/start/prerequisites/).

#### Node.js (Required for frontend development)
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

### Reclaiming build-disk space

Rust stores compiled dependencies, debug symbols, incremental compilation data, and app bundles in `src-tauri/target/`. This directory is generated and ignored by Git. To remove it safely when you are not building the app:

```bash
cd src-tauri
cargo clean
```

The next Rust or Tauri build will recompile dependencies.
<!-- 
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
``` -->

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
- **Icons**: Lucide React + React Icons
- **Font**: Inter
- **Build Tool**: Vite
- **Package Manager**: pnpm

