# Use a lightweight official Java 17 image
FROM eclipse-temurin:17-jre-alpine

# Maintainer info
LABEL maintainer="fixmate@example.com"

# Set a working directory inside the container
WORKDIR /app

# Copy the built jar file into the container
# We assume the jar file is already built via 'mvn clean package'
COPY target/fixmate-0.0.1-SNAPSHOT.jar app.jar

# Expose port 8080 to the outside world
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
