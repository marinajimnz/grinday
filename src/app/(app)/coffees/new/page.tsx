import { NewCoffeeForm } from "@/components/coffee/NewCoffeeForm";

export default function NewCoffeePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl text-ink">Nuevo café</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Alta manual. La lectura por foto llega en una fase posterior.
      </p>
      <div className="mt-8">
        <NewCoffeeForm />
      </div>
    </div>
  );
}
