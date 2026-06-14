import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import MenuOrderClient from '@/components/order/MenuOrderClient'

export const metadata = { title: 'Order Online — Tray Ordering' }

const DISHES = [
  {id:'a1',name:'Vegetable Samosa',description:'Crispy pastry with spiced potato filling',cuisine_region:'North Indian',category:'appetizer',is_veg:true,prices:{half_cents:3500,medium_cents:6500,full_cents:12000}},
  {id:'a2',name:'Paneer Tikka',description:'Tandoor-grilled cottage cheese with bell peppers',cuisine_region:'North Indian',category:'appetizer',is_veg:true,prices:{half_cents:5500,medium_cents:10000,full_cents:18500}},
  {id:'a3',name:'Chicken Tikka',description:'Marinated chicken grilled in tandoor',cuisine_region:'North Indian',category:'appetizer',is_veg:false,prices:{half_cents:6000,medium_cents:11500,full_cents:21000}},
  {id:'a4',name:'Seekh Kebab',description:'Spiced minced meat on skewers',cuisine_region:'North Indian',category:'appetizer',is_veg:false,prices:{half_cents:6500,medium_cents:12000,full_cents:22000}},
  {id:'a5',name:'Onion Bhaji',description:'Crispy onion fritters in spiced batter',cuisine_region:'North Indian',category:'appetizer',is_veg:true,prices:{half_cents:3200,medium_cents:5800,full_cents:10800}},
  {id:'v1',name:'Palak Paneer',description:'Cottage cheese in rich spiced spinach gravy',cuisine_region:'North Indian',category:'veg_curry',is_veg:true,prices:{half_cents:4800,medium_cents:9000,full_cents:16500}},
  {id:'v2',name:'Paneer Butter Masala',description:'Silky tomato-cream gravy with golden paneer',cuisine_region:'North Indian',category:'veg_curry',is_veg:true,prices:{half_cents:5000,medium_cents:9500,full_cents:17500}},
  {id:'v3',name:'Chana Masala',description:'Hearty chickpeas in tangy spiced gravy',cuisine_region:'North Indian',category:'veg_curry',is_veg:true,prices:{half_cents:4200,medium_cents:7800,full_cents:14500}},
  {id:'v4',name:'Dal Makhani',description:'Overnight-simmered black lentils in butter and cream',cuisine_region:'North Indian',category:'veg_curry',is_veg:true,prices:{half_cents:4000,medium_cents:7500,full_cents:13800}},
  {id:'v5',name:'Aloo Gobi',description:'Cauliflower and potato with cumin and turmeric',cuisine_region:'North Indian',category:'veg_curry',is_veg:true,prices:{half_cents:3800,medium_cents:7000,full_cents:13000}},
  {id:'v6',name:'Matar Paneer',description:'Green peas and cottage cheese in spiced gravy',cuisine_region:'North Indian',category:'veg_curry',is_veg:true,prices:{half_cents:4600,medium_cents:8600,full_cents:16000}},
  {id:'v7',name:'Undhiyu',description:'Mixed winter vegetables Gujarati style',cuisine_region:'Gujarati',category:'veg_curry',is_veg:true,prices:{half_cents:5200,medium_cents:9800,full_cents:18500}},
  {id:'v8',name:'Gatte Ki Sabzi',description:'Besan dumplings in yoghurt-based gravy',cuisine_region:'Rajasthani',category:'veg_curry',is_veg:true,prices:{half_cents:4400,medium_cents:8200,full_cents:15500}},
  {id:'v9',name:'Avial',description:'Mixed vegetables in coconut-yoghurt sauce — Kerala style',cuisine_region:'Kerala',category:'veg_curry',is_veg:true,prices:{half_cents:4200,medium_cents:7800,full_cents:14500}},
  {id:'v10',name:'Aloo Posto',description:'Potatoes in poppy seed paste — Bengali style',cuisine_region:'Bengali',category:'veg_curry',is_veg:true,prices:{half_cents:3800,medium_cents:7000,full_cents:13000}},
  {id:'n1',name:'Butter Chicken',description:'Tender chicken in velvety tomato-cream sauce',cuisine_region:'North Indian',category:'nonveg_curry',is_veg:false,prices:{half_cents:5800,medium_cents:10800,full_cents:20000}},
  {id:'n2',name:'Chicken Tikka Masala',description:'Tikka pieces in spiced onion-tomato masala',cuisine_region:'North Indian',category:'nonveg_curry',is_veg:false,prices:{half_cents:5800,medium_cents:10800,full_cents:20000}},
  {id:'n3',name:'Lamb Rogan Josh',description:'Slow-braised Kashmiri lamb in aromatic spices',cuisine_region:'North Indian',category:'nonveg_curry',is_veg:false,prices:{half_cents:6800,medium_cents:12800,full_cents:23800}},
  {id:'n4',name:'Goat Curry',description:'Slow-cooked goat in rich spiced gravy',cuisine_region:'North Indian',category:'nonveg_curry',is_veg:false,prices:{half_cents:7000,medium_cents:13200,full_cents:24500}},
  {id:'n5',name:'Kerala Fish Curry',description:'Red-hot fish curry with kudampuli',cuisine_region:'Kerala',category:'nonveg_curry',is_veg:false,prices:{half_cents:6500,medium_cents:12200,full_cents:22500}},
  {id:'n6',name:'Prawn Masala',description:'Fresh prawns in spiced coconut-onion masala',cuisine_region:'Kerala',category:'nonveg_curry',is_veg:false,prices:{half_cents:7200,medium_cents:13500,full_cents:25000}},
  {id:'n7',name:'Gongura Mutton',description:"Andhra's pride — mutton with tangy sorrel leaves",cuisine_region:'Telugu',category:'nonveg_curry',is_veg:false,prices:{half_cents:7200,medium_cents:13500,full_cents:25000}},
  {id:'n8',name:'Kosha Mangsho',description:'Slow-cooked Bengali goat curry',cuisine_region:'Bengali',category:'nonveg_curry',is_veg:false,prices:{half_cents:7000,medium_cents:13200,full_cents:24500}},
  {id:'n9',name:'Kori Rotti Chicken',description:'Mangalorean chicken curry with rice wafers',cuisine_region:'Karnataka',category:'nonveg_curry',is_veg:false,prices:{half_cents:6500,medium_cents:12200,full_cents:22500}},
  {id:'r1',name:'Veg Biryani',description:'Fragrant basmati with vegetables and saffron',cuisine_region:'North Indian',category:'rice',is_veg:true,prices:{half_cents:4500,medium_cents:8500,full_cents:15800}},
  {id:'r2',name:'Chicken Biryani',description:'Dum-cooked basmati with spiced chicken',cuisine_region:'North Indian',category:'rice',is_veg:false,prices:{half_cents:5800,medium_cents:10800,full_cents:20000}},
  {id:'r3',name:'Goat Biryani',description:'Slow-cooked goat dum biryani',cuisine_region:'North Indian',category:'rice',is_veg:false,prices:{half_cents:6800,medium_cents:12800,full_cents:23800}},
  {id:'r4',name:'Hyderabadi Biryani',description:'The legendary dum biryani with saffron',cuisine_region:'Telugu',category:'rice',is_veg:false,prices:{half_cents:6800,medium_cents:12800,full_cents:23800}},
  {id:'r5',name:'Jeera Rice',description:'Basmati rice tempered with cumin',cuisine_region:'North Indian',category:'rice',is_veg:true,prices:{half_cents:3200,medium_cents:5800,full_cents:10800}},
  {id:'b1',name:'Naan (per dozen)',description:'Soft leavened flatbread from the tandoor',cuisine_region:'North Indian',category:'bread',is_veg:true,prices:{half_cents:1800,medium_cents:3200,full_cents:5800}},
  {id:'b2',name:'Garlic Naan (per dozen)',description:'Naan topped with garlic and butter',cuisine_region:'North Indian',category:'bread',is_veg:true,prices:{half_cents:2200,medium_cents:3800,full_cents:6800}},
  {id:'b3',name:'Roti (per dozen)',description:'Whole wheat flatbread',cuisine_region:'North Indian',category:'bread',is_veg:true,prices:{half_cents:1500,medium_cents:2800,full_cents:5000}},
  {id:'b4',name:'Paratha (per dozen)',description:'Layered whole wheat flatbread',cuisine_region:'North Indian',category:'bread',is_veg:true,prices:{half_cents:2200,medium_cents:4000,full_cents:7200}},
  {id:'d1',name:'Gulab Jamun',description:'Soft milk dumplings in rose-cardamom syrup',cuisine_region:'North Indian',category:'dessert',is_veg:true,prices:{half_cents:3500,medium_cents:6500,full_cents:12000}},
  {id:'d2',name:'Kheer',description:'Creamy rice pudding with cardamom and saffron',cuisine_region:'North Indian',category:'dessert',is_veg:true,prices:{half_cents:3800,medium_cents:7000,full_cents:13000}},
  {id:'d3',name:'Rasmalai',description:'Soft paneer in saffron-cardamom cream',cuisine_region:'North Indian',category:'dessert',is_veg:true,prices:{half_cents:4200,medium_cents:7800,full_cents:14500}},
  {id:'d4',name:'Gajar Halwa',description:'Slow-cooked carrot pudding with ghee and nuts',cuisine_region:'North Indian',category:'dessert',is_veg:true,prices:{half_cents:3800,medium_cents:7000,full_cents:13000}},
  {id:'d5',name:'Payasam',description:'Kerala rice kheer with cardamom and cashews',cuisine_region:'Kerala',category:'dessert',is_veg:true,prices:{half_cents:3800,medium_cents:7000,full_cents:13000}},
  {id:'c1',name:'Pani Puri (per dozen)',description:'Crispy hollow puris with tangy spiced water',cuisine_region:'North Indian',category:'chaat',is_veg:true,prices:{half_cents:2500,medium_cents:4500,full_cents:8000}},
  {id:'c2',name:'Bhel Puri',description:'Puffed rice with chutneys and sev',cuisine_region:'North Indian',category:'chaat',is_veg:true,prices:{half_cents:2800,medium_cents:5000,full_cents:9000}},
  {id:'c3',name:'Dahi Chaat',description:'Puris with yoghurt, chutneys and sev',cuisine_region:'North Indian',category:'chaat',is_veg:true,prices:{half_cents:3000,medium_cents:5500,full_cents:10000}},
]

export default function OrderPage() {
  return (
    <>
      <Nav />
      <main className="pt-[88px] min-h-screen bg-ink">
        <div className="bg-royal-mid border-b border-gold/20 py-16 px-[7%] text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.025] pointer-events-none" style={{backgroundImage:'linear-gradient(rgba(201,168,76,1) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,1) 1px,transparent 1px)',backgroundSize:'72px 72px'}}/>
          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="section-label">Home Parties · Small Events · Gatherings</span>
            <h1 className="display-h text-[clamp(32px,5vw,60px)]">Order by the Tray — <em className="font-cormorant italic text-gold-pale">Fresh & Ready for Pickup</em></h1>
            <p className="text-cream/60 text-[15px] leading-loose">No minimum order. Half (5–6) · Medium (10–12) · Full (25–30). Pickup from <strong className="text-cream/80 font-normal">33 Tuttle St, Wakefield, MA.</strong></p>
          </div>
        </div>
        <MenuOrderClient dishes={DISHES} />
      </main>
      <Footer />
    </>
  )
}
