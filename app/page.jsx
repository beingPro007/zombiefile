
import { Footer } from '@/components/footer';
import { FileSender } from './components/fileSender';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Home() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center transition-colors pb-20">
      
      <ThemeToggle/>
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-foreground">
          Share Files Peer-to-Peer
        </h1>
       <FileSender/>
      </div>
    </main>
  );
}

