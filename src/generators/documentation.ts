import { readFileSync } from 'node:fs';
import type { System, ResolvedToken } from '../types.ts';
import { tokensCss, baseCss } from './css.ts';
import { VERSION } from '../version.ts';

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const asset = (name: string) => readFileSync(new URL('./documentation.' + name, import.meta.url), 'utf8');

export function documentationHtml(system: System, index: Map<string, ResolvedToken>, fontLink = '', options: { publicSite?: boolean } = {}): string {
  const template = asset('html');
  const navigation = [...template.matchAll(/<article class="doc-article" id="([^"]+)" data-label="([^"]+)"/g)]
    .map(([, id, label]) => '<a href="#' + escapeHtml(id) + '">' + escapeHtml(label) + '</a>')
    .join('\n');
  const values: Record<string, string> = {
    name: escapeHtml(system.meta.name),
    version: escapeHtml(VERSION),
    theme: escapeHtml(system.meta.defaultTheme),
    navigation,
    'font-link': fontLink,
    styles: tokensCss(system, index) + '\n' + baseCss(system, index) + '\n' + asset('css').replace(/--P-/g, '--' + system.meta.prefix + '-'),
    script: asset('js'),
    'connection-customization': options.publicSite
      ? 'Explore o catálogo público e conecte o Canon pelo prompt. O agente abre um <a href="#studio">Studio</a> próprio para você personalizar o design antes de criar as telas e durante todo o desenvolvimento.'
      : 'Você pode ajustar o visual durante todo o desenvolvimento no <a href="#studio">Studio</a> do projeto. Se quiser personalizar este design antes da conexão, clique em <strong>Save</strong> para levar seus ajustes junto.',
    'studio-intro': options.publicSite
      ? 'Explore os componentes e layouts aqui. Para personalizar, copie o prompt de conexão: o agente abre um Studio vinculado ao seu projeto.'
      : 'Personalize antes de conectar ou continue editando no Studio vinculado que o agente abre para o projeto.',
    'studio-save': options.publicSite
      ? 'No Studio aberto pelo agente, clique em <strong>Save</strong>. Isso atualiza os estilos do app e as referências que o agente usa nas próximas alterações. Suas escolhas ficam no seu projeto.'
      : 'Clique em <strong>Save</strong>. No Studio aberto pelo agente, isso atualiza os estilos do app e as referências que ele usa nas próximas alterações. Se você estiver preparando um design antes de conectar, Save guarda as escolhas que serão levadas ao projeto.',
    'public-links': options.publicSite ? '<a href="https://github.com/marcosdocanto/canon">Código e contribuições no GitHub</a>' : '',
  };
  return template.replace(/\{\{([a-z-]+)\}\}/g, (_match, key: string) => {
    if (!(key in values)) throw new Error('Unknown documentation placeholder: ' + key);
    return values[key];
  });
}
