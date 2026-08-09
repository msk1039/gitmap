import type { IconType } from 'react-icons';
import { FaJava } from 'react-icons/fa';
import {
  SiC,
  SiCplusplus,
  SiCss,
  SiDart,
  SiGo,
  SiHtml5,
  SiJavascript,
  SiKotlin,
  SiLua,
  SiPhp,
  SiPython,
  SiRuby,
  SiRust,
  SiSharp,
  SiScala,
  SiSvelte,
  SiSwift,
  SiTypescript,
  SiVuedotjs,
} from 'react-icons/si';

interface LanguageIconsProps {
  fileTypes: Record<string, number>;
  limit?: number;
}

interface LanguageDefinition {
  name: string;
  icon: IconType;
  color: string;
}

const languageByExtension: Record<string, LanguageDefinition> = {
  ts: { name: 'TypeScript', icon: SiTypescript, color: '#3178c6' },
  tsx: { name: 'TypeScript', icon: SiTypescript, color: '#3178c6' },
  js: { name: 'JavaScript', icon: SiJavascript, color: '#f7df1e' },
  jsx: { name: 'JavaScript', icon: SiJavascript, color: '#f7df1e' },
  mjs: { name: 'JavaScript', icon: SiJavascript, color: '#f7df1e' },
  cjs: { name: 'JavaScript', icon: SiJavascript, color: '#f7df1e' },
  rs: { name: 'Rust', icon: SiRust, color: '#dea584' },
  py: { name: 'Python', icon: SiPython, color: '#3776ab' },
  go: { name: 'Go', icon: SiGo, color: '#00add8' },
  c: { name: 'C', icon: SiC, color: '#a8b9cc' },
  h: { name: 'C', icon: SiC, color: '#a8b9cc' },
  cc: { name: 'C++', icon: SiCplusplus, color: '#00599c' },
  cpp: { name: 'C++', icon: SiCplusplus, color: '#00599c' },
  cxx: { name: 'C++', icon: SiCplusplus, color: '#00599c' },
  hpp: { name: 'C++', icon: SiCplusplus, color: '#00599c' },
  cs: { name: 'C#', icon: SiSharp, color: '#512bd4' },
  java: { name: 'Java', icon: FaJava, color: '#f89820' },
  kt: { name: 'Kotlin', icon: SiKotlin, color: '#7f52ff' },
  kts: { name: 'Kotlin', icon: SiKotlin, color: '#7f52ff' },
  swift: { name: 'Swift', icon: SiSwift, color: '#f05138' },
  dart: { name: 'Dart', icon: SiDart, color: '#0175c2' },
  rb: { name: 'Ruby', icon: SiRuby, color: '#cc342d' },
  php: { name: 'PHP', icon: SiPhp, color: '#777bb4' },
  lua: { name: 'Lua', icon: SiLua, color: '#2c2d72' },
  scala: { name: 'Scala', icon: SiScala, color: '#dc322f' },
  html: { name: 'HTML', icon: SiHtml5, color: '#e34f26' },
  htm: { name: 'HTML', icon: SiHtml5, color: '#e34f26' },
  css: { name: 'CSS', icon: SiCss, color: '#1572b6' },
  scss: { name: 'CSS', icon: SiCss, color: '#1572b6' },
  vue: { name: 'Vue', icon: SiVuedotjs, color: '#42b883' },
  svelte: { name: 'Svelte', icon: SiSvelte, color: '#ff3e00' },
};

export const LanguageIcons: React.FC<LanguageIconsProps> = ({ fileTypes, limit = 3 }) => {
  const languages = new Map<string, { definition: LanguageDefinition; files: number }>();

  for (const [extension, files] of Object.entries(fileTypes)) {
    const normalizedExtension = extension.replace(/^\./, '').toLowerCase();
    const definition = languageByExtension[normalizedExtension];
    if (!definition) continue;

    const current = languages.get(definition.name);
    languages.set(definition.name, {
      definition,
      files: (current?.files ?? 0) + files,
    });
  }

  const visibleLanguages = [...languages.values()]
    .sort((a, b) => b.files - a.files)
    .slice(0, limit);

  if (visibleLanguages.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5" aria-label="Primary languages">
      {visibleLanguages.map(({ definition, files }) => {
        const Icon = definition.icon;
        return (
          <span key={definition.name} title={`${definition.name} (${files} file${files === 1 ? '' : 's'})`}>
            <Icon className="h-3.5 w-3.5" color={definition.color} aria-label={definition.name} />
          </span>
        );
      })}
    </div>
  );
};
