import { Component } from '@angular/core';

@Component({
  selector: 'fury-color-palette',
  template: `
    <div class="color-palette-container">
      <h2>Ocean Theme - Color Palette</h2>
      
      <div class="palette-section">
        <h3>Primary Colors</h3>
        <div class="color-grid">
          <div class="color-card">
            <div class="color-preview" style="background: #115D8C;"></div>
            <div class="color-info">
              <strong>Deep Blue</strong>
              <span>#115D8C</span>
              <small>Primary</small>
            </div>
          </div>
          
          <div class="color-card">
            <div class="color-preview" style="background: #0B3B59;"></div>
            <div class="color-info">
              <strong>Dark Navy</strong>
              <span>#0B3B59</span>
              <small>Sidenav</small>
            </div>
          </div>
          
          <div class="color-card">
            <div class="color-preview" style="background: #9498F2;"></div>
            <div class="color-info">
              <strong>Periwinkle</strong>
              <span>#9498F2</span>
              <small>Accent</small>
            </div>
          </div>
          
          <div class="color-card">
            <div class="color-preview" style="background: #05DBF2;"></div>
            <div class="color-info">
              <strong>Cyan Bright</strong>
              <span>#05DBF2</span>
              <small>Highlight</small>
            </div>
          </div>
          
          <div class="color-card">
            <div class="color-preview" style="background: #F0F1F2;"></div>
            <div class="color-info">
              <strong>Light Gray</strong>
              <span>#F0F1F2</span>
              <small>Background</small>
            </div>
          </div>
        </div>
      </div>

      <div class="palette-section">
        <h3>Component Examples</h3>
        <div class="examples-grid">
          <button mat-raised-button color="primary">Primary Button</button>
          <button mat-raised-button color="accent">Accent Button</button>
          <button mat-raised-button color="warn">Warn Button</button>
          <button mat-stroked-button color="primary">Outlined</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .color-palette-container {
      padding: 24px;
    }

    h2 {
      margin-bottom: 32px;
      color: #115D8C;
    }

    .palette-section {
      margin-bottom: 48px;
    }

    h3 {
      margin-bottom: 16px;
      color: #0B3B59;
    }

    .color-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .color-card {
      border: 1px solid #E8EAED;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .color-preview {
      height: 120px;
      width: 100%;
    }

    .color-info {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .color-info strong {
      font-size: 14px;
      color: #1A1F2E;
    }

    .color-info span {
      font-size: 12px;
      color: #666;
      font-family: monospace;
    }

    .color-info small {
      font-size: 11px;
      color: #999;
      text-transform: uppercase;
    }

    .examples-grid {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
  `]
})
export class ColorPaletteComponent {}
