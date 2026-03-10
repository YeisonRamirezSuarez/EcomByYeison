"use client";

import { useState } from "react";
import { AuthModal } from "./AuthModal";

const SignIn = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="text-sm font-semibold hover:text-darkColor text-lightColor hover:cursor-pointer hoverEffect"
      >
        Login
      </button>

      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default SignIn;
