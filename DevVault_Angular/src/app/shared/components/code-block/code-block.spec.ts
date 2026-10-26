import { TestBed } from '@angular/core/testing';
import { NotificationService } from '../../../core/services/notification.service';
import { CodeBlock } from './code-block';

const XSS = '<img src=x onerror="window.__pwned=1"><script>window.__pwned=1</script>';

describe('CodeBlock', () => {
  const render = (code: string, language: string, maxLines: number | null = null) => {
    const fixture = TestBed.configureTestingModule({
      imports: [CodeBlock],
      providers: [{ provide: NotificationService, useValue: { success: () => {}, error: () => {} } }],
    }).createComponent(CodeBlock);
    fixture.componentRef.setInput('code', code);
    fixture.componentRef.setInput('language', language);
    fixture.componentRef.setInput('maxLines', maxLines);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('code') as HTMLElement;
  };

  afterEach(() => TestBed.resetTestingModule());

  for (const language of ['html', 'javascript', 'plaintext', 'not-a-language']) {
    it(`renders HTML/script as inert text (${language})`, () => {
      const code = render(XSS, language);
      expect(code.textContent).toBe(XSS);
      expect(code.querySelector('img, script')).toBeNull();
    });
  }

  it('highlights supported languages and preserves whitespace exactly', () => {
    const source = '\tconst a = 1;\n    return a;\n\n';
    const code = render(source, 'typescript');
    expect(code.querySelector('.hljs-keyword')).not.toBeNull();
    expect(code.textContent).toBe(source);
  });

  it('previews only the first lines', () => {
    expect(render('1\n2\n3\n4', 'plaintext', 2).textContent).toBe('1\n2');
  });
});
