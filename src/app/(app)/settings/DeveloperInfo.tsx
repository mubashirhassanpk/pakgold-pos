import { Globe, Github, Mail, MessageCircle, Code2 } from "lucide-react";

/**
 * "Developed by" credit. Edit the constants below to update contact details.
 * (Email / WhatsApp are blank until provided — they only render when set.)
 */
const DEV = {
  name: "Mubashir Hassan",
  title: "Founder & Developer",
  about:
    "Entrepreneur and developer with a passion for digital products & business development — founder of multiple ventures including StyleShop.pk.",
  website: "https://www.mubashirhassan.com",
  github: "https://github.com/mubashirhassanpk",
  email: "hello@mubashirhassan.com",
  whatsapp: "+92 322 2047786", // country code + number
};

export function DeveloperInfo() {
  const waDigits = DEV.whatsapp.replace(/\D/g, "");
  return (
    <section className="rounded-2xl bg-navy-900 text-white p-5 ring-1 ring-black/10">
      <div className="flex items-center gap-2 mb-1 text-gold">
        <Code2 size={18} />
        <h2 className="font-semibold">Developed by</h2>
      </div>
      <div className="mt-2">
        <div className="text-lg font-bold">
          {DEV.name} <span className="text-sm font-normal text-white/60">· {DEV.title}</span>
        </div>
        <p className="text-sm text-white/70 mt-1 max-w-2xl">{DEV.about}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={DEV.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-gold text-navy-900 text-sm font-semibold px-3 py-2 hover:brightness-105"
        >
          <Globe size={15} /> Website
        </a>
        <a
          href={DEV.github}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 text-white text-sm font-medium px-3 py-2 hover:bg-white/20"
        >
          <Github size={15} /> GitHub
        </a>
        {DEV.email && (
          <a
            href={`mailto:${DEV.email}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 text-white text-sm font-medium px-3 py-2 hover:bg-white/20"
          >
            <Mail size={15} /> Email
          </a>
        )}
        {waDigits && (
          <a
            href={`https://wa.me/${waDigits}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-success text-white text-sm font-medium px-3 py-2 hover:brightness-105"
          >
            <MessageCircle size={15} /> WhatsApp
          </a>
        )}
      </div>

      <p className="text-[11px] text-white/40 mt-4">
        PakGold POS · for Pakistani Sarafa / Zargari businesses · © {new Date().getFullYear()} {DEV.name}
      </p>
    </section>
  );
}
