export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12131C',
        panel: '#1B1D29',
        edge: '#2A2D3E',
        fog: '#9A9DB3',
        paper: '#EDEEF5',
        gain: '#3DDC97',
        loss: '#FF6B6B',
        stage: '#8B7CF6'
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      }
    }
  },
  plugins: []
}
