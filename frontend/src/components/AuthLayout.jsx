import authIllustration from '../assets/auth-illustration.jpg';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen w-full bg-[#F6F3ED] text-[#1C1614] font-sans flex flex-col lg:grid lg:grid-cols-2 overflow-x-hidden">
      {/* Desktop Left Column / Mobile Top Hero Section */}
      <div className="relative w-full h-[58vh] min-h-[380px] lg:h-full lg:min-h-screen overflow-hidden bg-[#1C1614] shrink-0">
        <img
          src={authIllustration}
          alt="Group expense illustration"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Ambient Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1C1614]/85 via-[#1C1614]/35 to-[#1C1614]/20 lg:bg-gradient-to-t lg:from-[#1C1614]/80 lg:via-[#1C1614]/30 lg:to-transparent" />

        {/* Overlay Text */}
        <div className="relative z-10 w-full h-full p-6 sm:p-10 lg:p-16 pb-14 sm:pb-16 lg:pb-16 flex flex-col justify-end">
          <div className="max-w-lg">
            <span className="inline-block px-3 py-1 mb-3 text-xs font-bold uppercase tracking-wider text-[#F6F3ED] bg-[#1C1614]/60 backdrop-blur-xs rounded-full border border-white/20">
              ExpenseSplitter
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-[#F6F3ED] tracking-tight leading-[1.1] drop-shadow-md">
              Spend together.<br />Stay even.
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[#F6F3ED]/90 font-medium max-w-md drop-shadow-xs">
              Split shared expenses, track group balances, and settle up effortlessly.
            </p>
          </div>
        </div>

        {/* Organic Wavy Transition for Mobile */}
        <div className="lg:hidden absolute -bottom-1 left-0 right-0 w-full overflow-hidden leading-none z-20 pointer-events-none">
          <svg
            className="relative block w-full h-12 sm:h-14 text-[#F6F3ED] fill-current"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path d="M0,0 C150,90 350,-40 500,50 C650,130 900,10 1200,60 L1200,120 L0,120 Z"></path>
          </svg>
        </div>
      </div>

      {/* Form Container (Themed Warm Right Column) */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 xl:p-16 bg-[#F6F3ED]">
        <div className="w-full max-w-md mx-auto bg-[#FAF8F4] border border-[#E5DED2] rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C1614] tracking-tight">
              {title}
            </h2>

            {subtitle && (
              <p className="text-xs sm:text-sm text-[#5E534B] mt-1.5 font-medium">
                {subtitle}
              </p>
            )}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}