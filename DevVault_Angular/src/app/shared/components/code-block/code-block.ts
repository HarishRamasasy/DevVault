import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import markdown from 'highlight.js/lib/languages/markdown';
import php from 'highlight.js/lib/languages/php';
import powershell from 'highlight.js/lib/languages/powershell';
import python from 'highlight.js/lib/languages/python';
import ruby from 'highlight.js/lib/languages/ruby';
import rust from 'highlight.js/lib/languages/rust';
import scss from 'highlight.js/lib/languages/scss';
import sql from 'highlight.js/lib/languages/sql';
import swift from 'highlight.js/lib/languages/swift';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { NotificationService } from '../../../core/services/notification.service';
import { languageLabel } from '../../../core/models/snippet.model';

// Only the languages DevVault offers are bundled (core build), keeping the lazy snippets chunk small.
const LANGUAGES = {
  bash, c, cpp, csharp, css, dockerfile, go, java, javascript, json, kotlin, markdown,
  php, powershell, python, ruby, rust, scss, sql, swift, typescript, xml, yaml,
};
for (const [name, definition] of Object.entries(LANGUAGES)) hljs.registerLanguage(name, definition);
hljs.registerAliases('html', { languageName: 'xml' });

// Read-only code view: syntax highlighting where supported, plain escaped text otherwise, plus a copy button.
@Component({
  selector: 'app-code-block',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './code-block.html',
  host: { class: 'block' },
})
export class CodeBlock {
  private readonly notify = inject(NotificationService);

  readonly code = input.required<string>();
  readonly language = input('plaintext');
  /** Show only the first N lines (card preview). Copy still copies the full code. */
  readonly maxLines = input<number | null>(null);

  readonly label = computed(() => languageLabel(this.language()));

  readonly visibleCode = computed(() => {
    const max = this.maxLines();
    return max ? this.code().split('\n').slice(0, max).join('\n') : this.code();
  });

  // hljs escapes every text node it emits, so its output is safe markup made only of <span class="hljs-*">.
  // Unknown languages return null and the template falls back to plain {{ }} interpolation.
  readonly highlighted = computed(() => {
    const language = this.language();
    if (!hljs.getLanguage(language)) return null;
    return hljs.highlight(this.visibleCode(), { language, ignoreIllegals: true }).value;
  });

  async copy(): Promise<void> {
    try {
      // navigator.clipboard is undefined on insecure origins; the throw lands in catch.
      await navigator.clipboard.writeText(this.code());
      this.notify.success('Code copied to clipboard.');
    } catch {
      this.notify.error('Unable to copy. Your browser blocked clipboard access.');
    }
  }
}
