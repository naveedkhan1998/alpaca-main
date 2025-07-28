package com.breeze.backend.controller;

import com.breeze.backend.dto.CandleDto;
import com.breeze.backend.dto.InstrumentDto;
import com.breeze.backend.dto.SubscribedInstrumentDto;
import com.breeze.backend.dto.BreezeAccountDto;
import com.breeze.backend.service.CandleService;
import com.breeze.backend.service.SubscribedInstrumentsService;
import com.breeze.backend.service.InstrumentService;
import com.breeze.backend.service.BreezeAccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class CoreController {

    @Autowired
    private CandleService candleService;

    @GetMapping("/candles/get_candles")
    public ResponseEntity<List<CandleDto>> getCandles(@RequestParam Long id, @RequestParam(required = false) Integer tf) {
        List<CandleDto> candles = candleService.getCandles(id, tf);
        return ResponseEntity.ok(candles);
    }

    @Autowired
    private SubscribedInstrumentsService subscribedInstrumentsService;

    @GetMapping("/subscribed_instruments")
    public ResponseEntity<List<SubscribedInstrumentDto>> getSubscribedInstruments() {
        return ResponseEntity.ok(subscribedInstrumentsService.getSubscribedInstruments());
    }

    @PostMapping("/subscribed_instruments/{instrumentId}/subscribe")
    public ResponseEntity<SubscribedInstrumentDto> subscribeInstrument(@PathVariable Long instrumentId, @RequestBody int duration) {
        return ResponseEntity.ok(subscribedInstrumentsService.subscribeInstrument(instrumentId, duration));
    }

    @DeleteMapping("/subscribed_instruments/{id}")
    public ResponseEntity<Void> unsubscribeInstrument(@PathVariable Long id) {
        subscribedInstrumentsService.unsubscribeInstrument(id);
        return ResponseEntity.ok().build();
    }

    @Autowired
    private InstrumentService instrumentService;

    @GetMapping("/instruments")
    public ResponseEntity<List<InstrumentDto>> searchInstruments(@RequestParam String exchange, @RequestParam String search) {
        if (search.length() < 2) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(instrumentService.searchInstruments(exchange, search));
    }

    @Autowired
    private BreezeAccountService breezeAccountService;

    @GetMapping("/breeze_accounts")
    public ResponseEntity<List<BreezeAccountDto>> getBreezeAccounts() {
        return ResponseEntity.ok(breezeAccountService.getBreezeAccounts());
    }

    @PostMapping("/breeze_accounts")
    public ResponseEntity<BreezeAccountDto> createBreezeAccount(@RequestBody BreezeAccountDto breezeAccountDto) {
        return ResponseEntity.ok(breezeAccountService.createBreezeAccount(breezeAccountDto));
    }

    @PutMapping("/breeze_accounts/{id}")
    public ResponseEntity<BreezeAccountDto> updateBreezeAccount(@PathVariable Long id, @RequestBody BreezeAccountDto breezeAccountDto) {
        return ResponseEntity.ok(breezeAccountService.updateBreezeAccount(id, breezeAccountDto));
    }
}
