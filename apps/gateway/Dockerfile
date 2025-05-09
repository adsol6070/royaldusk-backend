# Use NGINX as the base image
FROM nginx:1.25-alpine

# Copy the NGINX configuration files into the container
COPY apps/gateway/nginx.conf /etc/nginx/nginx.conf


# Expose port 80 to the host
EXPOSE 80

# Start the NGINX server
CMD ["nginx", "-g", "daemon off;"]
