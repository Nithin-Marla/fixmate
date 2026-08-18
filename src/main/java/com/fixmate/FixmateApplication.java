package com.fixmate;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableAsync
@EnableScheduling
@EnableDiscoveryClient
public class FixmateApplication {

	public static void main(String[] args) {
		SpringApplication.run(FixmateApplication.class, args);
	}

}
