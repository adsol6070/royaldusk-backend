export const config = {
  email: {
    service: process.env.EMAIL_SERVICE || "gmail",
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: process.env.EMAIL_PORT || 587,
    user: process.env.EMAIL_USER || "gaurav@adsoldigital.com",
    pass: process.env.EMAIL_PASS || "ixsb xglc qfxh exmh",
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || "amqp://user:password@localhost:5672",
    queue: process.env.RABBITMQ_QUEUE || "emailQueue",
  },
};
