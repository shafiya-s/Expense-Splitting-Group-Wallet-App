import authIllustration from '../assets/auth-illustration.jpg';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen w-full bg-white text-slate-800 font-sans flex flex-col lg:grid lg:grid-cols-2 overflow-x-hidden">

      <div className="hidden lg:flex lg:col-span-1 relative overflow-hidden h-full min-h-screen bg-[#FAF7F2]">
        <img
          src={authIllustration}
          alt="Group expense illustration"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        <div className="relative z-10 p-12 lg:p-16 w-full h-full flex flex-col justify-start">
          <h1 className="text-[clamp(1.5rem,6vw,2rem)] font-extrabold text-slate-900 tracking-tight leading-[1.05]">
            Spend together.<br />Stay even.
          </h1>
        </div>
      </div>

      <div className="lg:hidden relative w-full h-64 sm:h-72 overflow-hidden bg-[#FAF7F2]">
        <img
          src={authIllustration}
          alt="Group expense illustration"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        <div className="absolute inset-0 z-10 flex items-start justify-center text-center px-6 pt-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Spend together.<br />Stay even.
          </h1>
        </div>

        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none z-20">
          <svg
            className="relative block w-full h-10 sm:h-12 text-white fill-current"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path d="M0,0 C150,90 350,-40 500,50 C650,130 900,10 1200,60 L1200,120 L0,120 Z"></path>
          </svg>
        </div>
      </div>

      <div className="lg:col-span-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-16 bg-white min-h-[55vh] lg:min-h-screen">
        <div className="w-full max-w-md mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {title}
            </h2>

            {subtitle && (
              <p className="text-sm text-slate-500 mt-2">
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