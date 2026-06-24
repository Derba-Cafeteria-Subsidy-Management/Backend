import { Resend } from "resend";

export const resend = new Resend(
  process.env.RESEND_API_KEY
);


export const sendEmail = async (
  to: string,
  subject: string,
  html: string
) => {
  return resend.emails.send({
    from: "noreply@yourdomain.com",
    to,
    subject,
    html,
  });
};