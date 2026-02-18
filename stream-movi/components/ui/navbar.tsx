import React from "react";

const Navbar = () => {
  return (
    <div className="flex justify-between py-4 md:py-6 lg:py-10 px-4 md:px-8 lg:px-16">
      <img src="/logo/KLTR.png" alt="Logo" className="h-5 md:h-6" />

      <div className="text-sm md:text-base">Profile</div>
    </div>
  );
};

export default Navbar;
