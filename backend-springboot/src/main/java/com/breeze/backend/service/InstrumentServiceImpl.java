package com.breeze.backend.service;

import com.breeze.backend.dto.InstrumentDto;
import com.breeze.backend.model.Exchanges;
import com.breeze.backend.model.Instrument;
import com.breeze.backend.repository.ExchangesRepository;
import com.breeze.backend.repository.InstrumentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class InstrumentServiceImpl implements InstrumentService {

    @Autowired
    private InstrumentRepository instrumentRepository;

    @Autowired
    private ExchangesRepository exchangesRepository;

    @Override
    public List<InstrumentDto> searchInstruments(String exchange, String search) {
        Exchanges exchangeObj = exchangesRepository.findByTitle(exchange)
                .orElseThrow(() -> new RuntimeException("Invalid Exchange"));

        List<Instrument> instruments = instrumentRepository.findByExchangeAndShortNameContainingIgnoreCase(exchangeObj, search);

        if (exchange.equalsIgnoreCase("FON")) {
            instruments = instruments.stream().limit(50).collect(Collectors.toList());
        }

        return instruments.stream().map(this::convertToDto).collect(Collectors.toList());
    }

    private InstrumentDto convertToDto(Instrument instrument) {
        InstrumentDto instrumentDto = new InstrumentDto();
        instrumentDto.setId(instrument.getId());
        instrumentDto.setExchangeId(instrument.getExchange().getId());
        instrumentDto.setStockToken(instrument.getStockToken());
        instrumentDto.setToken(instrument.getToken());
        instrumentDto.setInstrument(instrument.getInstrument());
        instrumentDto.setShortName(instrument.getShortName());
        instrumentDto.setSeries(instrument.getSeries());
        instrumentDto.setCompanyName(instrument.getCompanyName());
        instrumentDto.setExpiry(instrument.getExpiry());
        instrumentDto.setStrikePrice(instrument.getStrikePrice());
        instrumentDto.setOptionType(instrument.getOptionType());
        instrumentDto.setExchangeCode(instrument.getExchangeCode());
        return instrumentDto;
    }
}
