export default function ReactPlayerLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <section className="w-full flex flex-col items-center  gap-4 py-8 md:py-10">
          {children}
      </section>
    );
  }
  