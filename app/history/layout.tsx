import Image from "next/image";

export default function TableLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
      <div className="absolute inset-0 z-0">
        <Image
          alt="Background with stars"
          className="opacity-50"
          layout="fill"
          objectFit="cover"
          src="/bg.jpg"
        />
      </div>
      <div className="container max-w-6xl text-center justify-center z-10">
        {children}
      </div>
    </section>
  );
}
