import { StoreForm } from "../store-form";
import { hr } from "@/messages/hr";

export default function NewStorePage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold">{hr.super.form.titleNew}</h1>
      <div className="mt-6">
        <StoreForm mode="create" />
      </div>
    </div>
  );
}
