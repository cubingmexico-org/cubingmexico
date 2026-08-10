export default function Loading() {
  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto animate-pulse">
      <div className="h-8 bg-muted rounded w-2/3 mx-auto" />
      <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
      <div className="h-20 bg-muted rounded w-full" />
      <div className="h-40 bg-muted rounded w-full" />
    </div>
  );
}
