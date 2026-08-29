package com.guitarapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class GuitarAppApplication {

	public static void main(String[] args) {
		SpringApplication.run(GuitarAppApplication.class, args);
	}

}
