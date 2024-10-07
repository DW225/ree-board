"use client";

import { useRef, useState, useTransition } from "react";
import { updateProfile } from "@/lib/actions/updateProfile";

interface ProfileUpdateFormProps {
  initialUsername: string;
  initialName: string;
}

export default function ProfileUpdateForm({
  initialUsername,
  initialName,
}: Readonly<ProfileUpdateFormProps>) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await updateProfile(formData);
        formRef.current?.reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : "An error occurred");
      }
    });
  };

  return (
    <form ref={formRef} action={handleSubmit} className="mt-4">
      <div className="mb-4">
        <label
          htmlFor="username"
          className="block text-gray-700 text-sm font-bold mb-2"
        >
          Username
        </label>
        <input
          type="text"
          id="username"
          name="username"
          defaultValue={initialUsername}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
      </div>
      <div className="mb-4">
        <label
          htmlFor="name"
          className="block text-gray-700 text-sm font-bold mb-2"
        >
          Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          defaultValue={initialName}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
      >
        {isPending ? "Updating..." : "Update Profile"}
      </button>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </form>
  );
}
