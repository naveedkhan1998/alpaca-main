package com.breeze.backend.config;

import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String WEBSOCKET_QUEUE = "websocketQueue";
    public static final String CANDLE_QUEUE = "candleQueue";

    @Bean
    public Queue websocketQueue() {
        return new Queue(WEBSOCKET_QUEUE, true);
    }

    @Bean
    public Queue candleQueue() {
        return new Queue(CANDLE_QUEUE, true);
    }
}
