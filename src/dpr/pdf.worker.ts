// Worker entry: polyfill first (imports run in order), then the pdfjs worker. Bundled and transpiled by Vite.
import './withResolvers.ts'
import 'pdfjs-dist/legacy/build/pdf.worker.min.mjs'
