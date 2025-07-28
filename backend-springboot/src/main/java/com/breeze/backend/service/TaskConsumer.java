package com.breeze.backend.service;

import com.breeze.backend.config.RabbitMQConfig;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class TaskConsumer {

    @RabbitListener(queues = RabbitMQConfig.WEBSOCKET_QUEUE)
    public void receiveWebsocketTask(String message) {
        System.out.println("Received websocket task: " + message);
        // TODO: Implement websocket task processing logic
    }

    @RabbitListener(queues = RabbitMQConfig.CANDLE_QUEUE)
    public void receiveCandleTask(String message) {
        System.out.println("Received candle task: " + message);
        // TODO: Implement candle task processing logic
    }
}
