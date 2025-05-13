export const config = {
  email: {
    service: process.env.EMAIL_SERVICE || "gmail",
    host: process.env.EMAIL_HOST || "smtp.ethereal.email",
    port: process.env.EMAIL_PORT || 587,
    user: process.env.EMAIL_USER || "johnny.mante2@ethereal.email",
    pass: process.env.EMAIL_PASS || "9B7UYSKZCjC7VtmgEN",
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || "amqp://user:password@rabbitmq:5672",
    queue: process.env.RABBITMQ_QUEUE || "emailQueue",
  },
};
