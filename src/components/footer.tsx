export function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built with React, shadcn/ui, and Tailwind CSS. Theme toggle powered by next-themes.
          </p>
        </div>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span>© 2025 React App</span>
        </div>
      </div>
    </footer>
  );
}