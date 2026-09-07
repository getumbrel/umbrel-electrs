import QRCode from "qrcode";
import { useEffect, useState } from "react";

export function ConnectionQr({ value }: { value: string }) {
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void QRCode.toString(value, {
      type: "svg",
      width: 224,
      margin: 1,
      color: { dark: "#F7931A", light: "#00000000" },
      errorCorrectionLevel: "H",
    }).then((svg) => {
      if (active) setSource(`data:image/svg+xml,${encodeURIComponent(svg)}`);
    });
    return () => { active = false; };
  }, [value]);

  return (
    <div className="connection-qr">
      {source
        ? <img src={source} alt={`QR code for ${value}`} />
        : <div className="qr-placeholder" aria-label="Generating QR code" />}
      <span className="qr-brand" aria-hidden="true"><img src="/icon.png" alt="" /></span>
    </div>
  );
}
