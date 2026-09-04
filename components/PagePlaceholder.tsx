import type { ComponentType } from "react";
import type { IconProps } from "./icons";

interface PagePlaceholderProps {
  title: string;
  description: string;
  icon: ComponentType<IconProps>;
}

export default function PagePlaceholder({
  title,
  description,
  icon: Icon,
}: PagePlaceholderProps) {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
        {title}
      </h1>
      <div className="mt-6 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-20 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
          <Icon className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-zinc-900">
          {title} coming next
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
          {description}
        </p>
      </div>
    </div>
  );
}
