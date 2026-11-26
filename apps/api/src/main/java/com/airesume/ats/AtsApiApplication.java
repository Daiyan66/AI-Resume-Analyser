package com.airesume.ats;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@org.springframework.scheduling.annotation.EnableScheduling
@SpringBootApplication
public class AtsApiApplication {
    public static void main(String[] args) {
        SpringApplication.run(AtsApiApplication.class, args);
    }
}
