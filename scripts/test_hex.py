hex_id = "4d4235343138323837"
decoded = bytes.fromhex(hex_id).decode('utf-8', errors='ignore')
print("Decoded ID:", decoded)

hex_id2 = "4d423834363733353535"
decoded2 = bytes.fromhex(hex_id2).decode('utf-8', errors='ignore')
print("Decoded ID 2:", decoded2)
